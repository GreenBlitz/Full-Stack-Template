import { rangeArr } from "./Utils";
import { BitArray } from "./BitArray";

// TODO add signed support!
function serdeUnsignedInt(bitCount: number): Serde<number> {
  function serializer(serialiedData: BitArray, num: number) {
    const arr = new BitArray();

    
    for (let i = 0; i < bitCount; i++) {
      arr.insertBool(num % 2 === 1);
      num = Math.floor(num / 2);
    }
    serialiedData.insert(arr);
  }
  function deserializer(serializedData: BitArray): number {
    let num = 0;

    for (let i = 0; i < bitCount; i++) {
      num += (serializedData.consumeBool() ? 1 : 0) << i;
    }
    return num;
  }
  return {
    serializer,
    deserializer,
  };
}

function serdeStringifiedNum(bitCount: number): Serde<string> {
  function serializer(seriailzedData: BitArray, num: string) {
    return serdeUnsignedInt(bitCount).serializer(seriailzedData, Number(num));
  }
  function deserializer(seriailzedData: BitArray): string {
    return serdeUnsignedInt(bitCount).deserializer(seriailzedData).toString();
  }
  return {
    serializer,
    deserializer,
  };
}

function serdeString(): Serde<string> {
  const STRING_LENGTH_BIT_COUNT: number = 12;
  function serializer(serializedData: BitArray, string: string) {
    const encodedString: Uint8Array = new TextEncoder().encode(string);

    serdeUnsignedInt(STRING_LENGTH_BIT_COUNT).serializer(
      serializedData,
      encodedString.length
    );
    serializedData.insert(encodedString, encodedString.length * 8);
  }
  function deserializer(serializedData: BitArray): string {
    let encodedStringLength = serdeUnsignedInt(
      STRING_LENGTH_BIT_COUNT
    ).deserializer(serializedData);
    let encodedString = serializedData.consumeBits(encodedStringLength * 8);
    return new TextDecoder().decode(encodedString);
  }
  return {
    serializer,
    deserializer,
  };
}

type Serializer<T> = (seriailzedData: BitArray, data: T) => void;
// return field name, and its appropriate Serializer
type RecordSerializer<T> = Record<string, Serializer<T>>;

// returns the deserializedData
type Deserializer<T> = (serializedData: BitArray) => T;
// return field name, and its appropriate Deserializer
type RecordDeserializer<T> = Record<string, Deserializer<T>>;

interface FieldsRecordSerde<T> {
  serializer: RecordSerializer<T>;
  deserializer: RecordDeserializer<T>;
}
interface Serde<T> {
  serializer: Serializer<T>;
  deserializer: Deserializer<T>;
}

function serdeOptionalFieldsRecord<T>(
  fieldsSerde: FieldsRecordSerde<T>
): Serde<Record<string, T>> {
  function fieldsExistenceBitCount(
    fields: RecordSerializer<T> | RecordDeserializer<T>
  ): number {
    return Object.keys(fields).length;
  }
  function serializer(
    serializedData: BitArray,
    fieldsSerializers: RecordSerializer<T>,
    data: Record<string, T>
  ) {
    let fieldsExistenceArray = new BitArray();
    let serializedFields = new BitArray();

    for (const fieldIndex in Object.keys(fieldsSerializers)) {
      let field = Object.keys(fieldsSerializers)[fieldIndex];
      let fieldValue = data[field];
      if (!fieldValue) {
        fieldsExistenceArray.insertBool(false);
        continue;
      }
      fieldsExistenceArray.insertBool(true);
      fieldsSerializers[field](serializedFields, fieldValue);
    }
    serializedData.insert(fieldsExistenceArray);
    serializedData.insert(serializedFields);
  }
  function deserializer(
    fieldsDeserializers: RecordDeserializer<T>,
    serializedData: BitArray
  ): Record<string, T> {
    let data: Record<string, T> = {};

    let fieldsExistence: boolean[] = Array.from(
      rangeArr(0, fieldsExistenceBitCount(fieldsDeserializers)).map((_) =>
        serializedData.consumeBool()
      )
    );

    const deserializersKeys = Object.keys(fieldsDeserializers);
    for (let i = 0; i < deserializersKeys.length; i++) {
      if (!fieldsExistence[i]) {
        continue;
      }
      const field = deserializersKeys[i];
      let fieldData = fieldsDeserializers[field](serializedData);
      Reflect.set(data, field, fieldData);
    }
    return data;
  }
  return {
    serializer: function (serializedData, data) {
      return serializer(serializedData, fieldsSerde.serializer, data);
    },
    deserializer: function (serializedData) {
      return deserializer(fieldsSerde.deserializer, serializedData);
    },
  };
}

export function serdeRecord<T>(
  fieldsSerde: FieldsRecordSerde<T>
): Serde<Record<string, T>> {
  function serializer(
    serializedData: BitArray,
    fieldsSerializers: RecordSerializer<T>,
    data: Record<string, T>
  ) {
    for (const fieldIndex in Object.keys(fieldsSerializers)) {
      const field = Object.keys(fieldsSerializers)[fieldIndex];
      fieldsSerializers[field](serializedData, data[field]);
    }
  }
  function deserializer(
    fieldsDeserializers: RecordDeserializer<T>,
    serializedData: BitArray
  ): Record<string, T> {
    let data: Record<string, T> = {};
    for (const fieldIndex in Object.keys(fieldsDeserializers)) {
      let field = Object.keys(fieldsDeserializers)[fieldIndex];
      let fieldData = fieldsDeserializers[field](serializedData);
      Reflect.set(data, field, fieldData);
    }
    return data;
  }
  return {
    serializer: function (serializedData: BitArray, data) {
      return serializer(serializedData, fieldsSerde.serializer, data);
    },
    deserializer: function (serializedData: BitArray) {
      return deserializer(fieldsSerde.deserializer, serializedData);
    },
  };
}

const ARRAY_LENGTH_DEFAULT_BIT_COUNT: number = 12;
function serdeArray<T>(
  itemSerde: Serde<T>,
  bitCount = ARRAY_LENGTH_DEFAULT_BIT_COUNT
): Serde<T[]> {
  const ARRAY_LENGTH_SERDE = serdeUnsignedInt(bitCount);
  function serializer(
    itemSerializer: Serializer<T>,
    serializedData: BitArray,
    arr: T[]
  ) {
    ARRAY_LENGTH_SERDE.serializer(serializedData, arr.length);
    for (const index in arr) {
      itemSerializer(serializedData, arr[index]);
    }
  }
  function deserializer(
    itemDeserializer: Deserializer<T>,
    serializedData: BitArray
  ): T[] {
    const arrayLength = ARRAY_LENGTH_SERDE.deserializer(serializedData);

    let arr: T[] = [];
    for (let i = 0; i < arrayLength; i++) {
      arr.push(itemDeserializer(serializedData));
    }
    return arr;
  }
  return {
    serializer: function (serializedData: BitArray, arr: T[]) {
      return serializer(itemSerde.serializer, serializedData, arr);
    },
    deserializer: function (serializedData: BitArray) {
      return deserializer(itemSerde.deserializer, serializedData);
    },
  };
}

function serdeMixedArrayRecord<T, U>(
  arrayItemSerde: Serde<T>,
  recordFieldSerde: FieldsRecordSerde<U>,
  areRecordFieldsOptional = false
): Serde<T[] | Record<string, U>> {
  const MIXED_DATA_POSSIBLE_TYPES = areRecordFieldsOptional
    ? ["Array", "OptionalFieldsRecord"]
    : ["Array", "Record"];
  function serializer(serializedData: BitArray, data: T[] | Record<string, U>) {
    if (data instanceof Array) {
      serdeEnumedString(MIXED_DATA_POSSIBLE_TYPES).serializer(
        serializedData,
        "Array"
      );
      serdeArray(arrayItemSerde).serializer(serializedData, data);
      return;
    } else if (data.constructor === Object) {
      if (areRecordFieldsOptional) {
        serdeEnumedString(MIXED_DATA_POSSIBLE_TYPES).serializer(
          serializedData,
          "OptionalFieldsRecord"
        );
        serdeOptionalFieldsRecord(recordFieldSerde).serializer(
          serializedData,
          data
        );
        return;
      } else {
        serdeEnumedString(MIXED_DATA_POSSIBLE_TYPES).serializer(
          serializedData,
          "Record"
        );
        serdeRecord(recordFieldSerde).serializer(serializedData, data);
        return;
      }
    }
    throw new Error(
      "while attempting to serialize " + data + ": data is not Record or Array"
    );
  }
  function deserializer(serializedData: BitArray) {
    let dataType = serdeEnumedString(MIXED_DATA_POSSIBLE_TYPES).deserializer(
      serializedData
    );
    if (dataType == "Array") {
      return serdeArray(arrayItemSerde).deserializer(serializedData);
    } else if (dataType == "Record") {
      return serdeRecord(recordFieldSerde).deserializer(serializedData);
    } else {
      return serdeOptionalFieldsRecord(recordFieldSerde).deserializer(
        serializedData
      );
    }
  }
  return {
    serializer,
    deserializer,
  };
}

function serdeEnumedString<Options extends string>(
  possibleValues: Options[]
): Serde<Options> {
  function bitsNeeded(possibleValuesCount: number): number {
    return Math.ceil(Math.log2(possibleValuesCount));
  }
  function serializer(
    possibleValues: Options[],
    serializedData: BitArray,
    data: Options
  ) {
    const neededBits = bitsNeeded(possibleValues.length);
    for (let i = 0; i < possibleValues.length; i++) {
      if (data == possibleValues[i]) {
        serdeUnsignedInt(neededBits).serializer(serializedData, i);
        return;
      }
    }
    throw new Error(
      "value " + data + " is not included in possible values: " + possibleValues
    );
  }
  function deserializer(
    possibleValues: Options[],
    serializedData: BitArray
  ): Options {
    const neededBits = bitsNeeded(possibleValues.length);
    const valueIdentifier =
      serdeUnsignedInt(neededBits).deserializer(serializedData);
    if (valueIdentifier < possibleValues.length) {
      return possibleValues[valueIdentifier];
    }
    throw new Error(
      "valueIdentifier " +
        valueIdentifier +
        " does not exist in possible values: " +
        possibleValues
    );
  }
  return {
    serializer: function (serializedData, data) {
      return serializer(possibleValues, serializedData, data);
    },
    deserializer: function (serializedData) {
      return deserializer(possibleValues, serializedData);
    },
  };
}

function serdeStringifiedArray<T>(itemSerde: Serde<T>): Serde<string> {
  function serializer(
    itemSerde: Serde<T>,
    serializedData: BitArray,
    arr: string
  ) {
    if (arr === undefined) {
      console.log("TRYING TO PARSE undefined");
    }
    serdeArray(itemSerde).serializer(serializedData, JSON.parse(arr));
  }
  function deserializer(itemSerde: Serde<T>, serializedData: BitArray) {
    let deserializedData = serdeArray(itemSerde).deserializer(serializedData);
    return JSON.stringify(deserializedData);
  }

  return {
    serializer: function (serializedData: BitArray, arr) {
      return serializer(itemSerde, serializedData, arr);
    },
    deserializer: function (serializedArr) {
      return deserializer(itemSerde, serializedArr);
    },
  };
}

function serdeBool(): Serde<boolean> {
  function serializer(serializedData: BitArray, bool: boolean) {
    serializedData.insertBool(bool);
  }
  function deserializer(serializedData: BitArray) {
    return serializedData.consumeBool();
  }
  return {
    serializer,
    deserializer,
  };
}

function serdeOptional<T>(tSerde: Serde<T>): Serde<T | undefined> {
  function serializer(serializedData: BitArray, value?: T) {
    serdeBool().serializer(serializedData, value != undefined);
    if (value) {
      tSerde.serializer(serializedData, value);
    }
  }
  function deserializer(serializedData: BitArray): T | undefined {
    if (serdeBool().deserializer(serializedData)) {
      return tSerde.deserializer(serializedData);
    } else {
      return undefined;
    }
  }
  return {
    serializer,
    deserializer,
  };
}

function serdeRecordFieldsBuilder(
  fieldNamesSerdes: [string, Serde<any>][]
): FieldsRecordSerde<any> {
  let serdeRecord = { serializer: {}, deserializer: {} };
  fieldNamesSerdes.forEach(([fieldName, fieldSerde]) => {
    serdeRecord.serializer[fieldName] = fieldSerde.serializer;
    serdeRecord.deserializer[fieldName] = fieldSerde.deserializer;
  });
  return serdeRecord;
}

export function serialize<T>(serializer: Serializer<T>, data: T): Uint8Array {
  let serializedData = new BitArray();
  serializer(serializedData, data);
  return serializedData.consume();
}

export function deserialize<T>(
  deserializer: Deserializer<T>,
  serializedDataUint8: Uint8Array
): T {
  let serializedData = new BitArray(serializedDataUint8);
  return deserializer(serializedData);
}

const TEAM_NUMBER_BIT_COUNT = 2 * 8;

const CLIMB_POSSIBLE_VALUES = [
  "Off Barge",
  "Park",
  "Shallow Cage",
  "Deep Cage",
  "Tried Deep",
];

const QUAL_BIT_COUNT = 9;
const DEFENSE_RATING_BIT_COUNT = 3;


// the previous use of functions for this that are better written with serdeRecordFieldsBuilder is not reccomended, use it instead of being like yoni  :)

export const qrSerde: FieldsRecordSerde<any> = serdeRecordFieldsBuilder([
  ["teamNumber", serdeTeamNumber()],
  ["teleReefPick", serdeReefPick()],
  ["autoReefPick", serdeReefPick()],
  ["endgameCollection", serdeCollectedObjects()],
  ["climb", serdeEnumedString(CLIMB_POSSIBLE_VALUES)],
  ["qual", serdeStringifiedNum(QUAL_BIT_COUNT)],
  ["defense", serdeOptional(serdeUnsignedInt(DEFENSE_RATING_BIT_COUNT))],
  [
    "defensiveEvasion",
    serdeOptional(serdeUnsignedInt(DEFENSE_RATING_BIT_COUNT)),
  ],
  ["scouterName", serdeString()],
  ["noShow", serdeBool()],
  ["comment", serdeString()],
]);
