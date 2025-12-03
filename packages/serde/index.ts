// בס"ד
import { rangeArr, BitArray, bitArrayLength } from "./BitArray";

const binaryTrueValue = 1;
const binaryModulus = 2;
// TODO add signed support!
function serdeUnsignedInt(bitCount: number): Serde<number> {
  function serializer(serialiedData: BitArray, num: number) {
    const arr = new BitArray();

    rangeArr(bitCount).forEach(() => {
      arr.insertBool(num % binaryModulus === binaryTrueValue);
      num = Math.floor(num / binaryModulus);
    });
    serialiedData.insertBitArray(arr);
  }
  function deserializer(serializedData: BitArray): number {
    let num = 0;

    rangeArr(bitCount).forEach((i) => {
      num += Number(serializedData.consumeBool()) << i;
    });
    return num;
  }
  return {
    serializer,
    deserializer,
  };
}

function serdeStringifiedNum(bitCount: number): Serde<string> {
  function serializer(seriailzedData: BitArray, num: string) {
    serdeUnsignedInt(bitCount).serializer(seriailzedData, Number(num));
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
  const stringLengthBitCount = 12;
  function serializer(serializedData: BitArray, string: string) {
    const encodedString: Uint8Array = new TextEncoder().encode(string);

    serdeUnsignedInt(stringLengthBitCount).serializer(
      serializedData,
      encodedString.length
    );
    serializedData.insertUInt8Array(
      encodedString,
      encodedString.length * bitArrayLength
    );
  }
  function deserializer(serializedData: BitArray): string {
    const encodedStringLength =
      serdeUnsignedInt(stringLengthBitCount).deserializer(serializedData);
    const encodedString = serializedData.consumeBits(
      encodedStringLength * bitArrayLength
    );
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
    const fieldsExistenceArray = new BitArray();
    const serializedFields = new BitArray();

    Object.keys(fieldsSerializers).forEach((field) => {
      const fieldValue = data[field];
      if (!fieldValue) {
        fieldsExistenceArray.insertBool(false);
        return;
      }
      fieldsExistenceArray.insertBool(true);
      fieldsSerializers[field](serializedFields, fieldValue);
    });
    serializedData.insertBitArray(fieldsExistenceArray);
    serializedData.insertBitArray(serializedFields);
  }
  function deserializer(
    fieldsDeserializers: RecordDeserializer<T>,
    serializedData: BitArray
  ): Record<string, T> {
    const data: Record<string, T> = {};

    const fieldsExistence: boolean[] = Array.from(
      rangeArr(fieldsExistenceBitCount(fieldsDeserializers)).map(() =>
        serializedData.consumeBool()
      )
    );

    Object.keys(fieldsDeserializers).forEach((field, index) => {
      if (!fieldsExistence[index]) {
        return;
      }
      const fieldData = fieldsDeserializers[field](serializedData);
      Reflect.set(data, field, fieldData);
    });

    return data;
  }
  return {
    serializer: function (serializedData, data) {
      serializer(serializedData, fieldsSerde.serializer, data);
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
    Object.keys(fieldsSerializers).forEach((field) => {
      fieldsSerializers[field](serializedData, data[field]);
    });
  }
  function deserializer(
    fieldsDeserializers: RecordDeserializer<T>,
    serializedData: BitArray
  ): Record<string, T> {
    const data: Record<string, T> = {};
    Object.keys(fieldsDeserializers).forEach((field) => {
      const fieldData = fieldsDeserializers[field](serializedData);
      Reflect.set(data, field, fieldData);
    });
    return data;
  }
  return {
    serializer: function (serializedData: BitArray, data) {
      serializer(serializedData, fieldsSerde.serializer, data);
    },
    deserializer: function (serializedData: BitArray) {
      return deserializer(fieldsSerde.deserializer, serializedData);
    },
  };
}

const arrayLengthDefaultBitCount = 12;
function serdeArray<T>(
  itemSerde: Serde<T>,
  bitCount = arrayLengthDefaultBitCount
): Serde<T[]> {
  const arrayLengthSerde = serdeUnsignedInt(bitCount);
  function serializer(
    itemSerializer: Serializer<T>,
    serializedData: BitArray,
    arr: T[]
  ) {
    arrayLengthSerde.serializer(serializedData, arr.length);
    arr.forEach((value) => {
      itemSerializer(serializedData, value);
    });
  }
  function deserializer(
    itemDeserializer: Deserializer<T>,
    serializedData: BitArray
  ): T[] {
    const arrayLength = arrayLengthSerde.deserializer(serializedData);

    const arr: T[] = [];
    for (let i = 0; i < arrayLength; i++) {
      arr.push(itemDeserializer(serializedData));
    }
    return arr;
  }
  return {
    serializer: function (serializedData: BitArray, arr: T[]) {
      serializer(itemSerde.serializer, serializedData, arr);
    },
    deserializer: function (serializedData: BitArray) {
      return deserializer(itemSerde.deserializer, serializedData);
    },
  };
}

// function serdeMixedArrayRecord<T, U>(
//   arrayItemSerde: Serde<T>,
//   recordFieldSerde: FieldsRecordSerde<U>,
//   areRecordFieldsOptional = false
// ): Serde<T[] | Record<string, U>> {
//   const MIXED_DATA_POSSIBLE_TYPES = areRecordFieldsOptional
//     ? ["Array", "OptionalFieldsRecord"]
//     : ["Array", "Record"];
//   function serializer(serializedData: BitArray, data: T[] | Record<string, U>) {
//     if (data instanceof Array) {
//       serdeEnumedString(MIXED_DATA_POSSIBLE_TYPES).serializer(
//         serializedData,
//         "Array"
//       );
//       serdeArray(arrayItemSerde).serializer(serializedData, data);
//       return;
//     } else if (data.constructor === Object) {
//       if (areRecordFieldsOptional) {
//         serdeEnumedString(MIXED_DATA_POSSIBLE_TYPES).serializer(
//           serializedData,
//           "OptionalFieldsRecord"
//         );
//         serdeOptionalFieldsRecord(recordFieldSerde).serializer(
//           serializedData,
//           data
//         );
//         return;
//       } else {
//         serdeEnumedString(MIXED_DATA_POSSIBLE_TYPES).serializer(
//           serializedData,
//           "Record"
//         );
//         serdeRecord(recordFieldSerde).serializer(serializedData, data);
//         return;
//       }
//     }
//     throw new Error(
//       "while attempting to serialize " + data + ": data is not Record or Array"
//     );
//   }
//   function deserializer(serializedData: BitArray) {
//     let dataType = serdeEnumedString(MIXED_DATA_POSSIBLE_TYPES).deserializer(
//       serializedData
//     );
//     if (dataType == "Array") {
//       return serdeArray(arrayItemSerde).deserializer(serializedData);
//     } else if (dataType == "Record") {
//       return serdeRecord(recordFieldSerde).deserializer(serializedData);
//     } else {
//       return serdeOptionalFieldsRecord(recordFieldSerde).deserializer(
//         serializedData
//       );
//     }
//   }
//   return {
//     serializer,
//     deserializer,
//   };
// }

function serdeEnumedString<Options extends string>(
  possibleValues: Options[]
): Serde<Options> {
  function bitsNeeded(possibleValuesCount: number): number {
    return Math.ceil(Math.log2(possibleValuesCount));
  }
  function serializer(serializedData: BitArray, data: Options) {
    const neededBits = bitsNeeded(possibleValues.length);
    for (let i = 0; i < possibleValues.length; i++) {
      if (data == possibleValues[i]) {
        serdeUnsignedInt(neededBits).serializer(serializedData, i);
        return;
      }
    }
    throw new Error(
      `value ${data} is not included in possible values: ${possibleValues.toString()}`
    );
  }
  function deserializer(serializedData: BitArray): Options {
    const neededBits = bitsNeeded(possibleValues.length);
    const valueIdentifier =
      serdeUnsignedInt(neededBits).deserializer(serializedData);
    if (valueIdentifier < possibleValues.length) {
      return possibleValues[valueIdentifier];
    }
    throw new Error(
      `valueIdentifier ${valueIdentifier} does not exist in possible values: ${possibleValues.toString()}`
    );
  }
  return {
    serializer: function (serializedData, data) {
      serializer(serializedData, data);
    },
    deserializer: function (serializedData) {
      return deserializer(serializedData);
    },
  };
}

function serdeStringifiedArray<T>(itemSerde: Serde<T>): Serde<string> {
  function serializer(serializedData: BitArray, arr: string) {
    serdeArray(itemSerde).serializer(serializedData, JSON.parse(arr));
  }
  function deserializer(serializedData: BitArray) {
    const deserializedData = serdeArray(itemSerde).deserializer(serializedData);
    return JSON.stringify(deserializedData);
  }

  return {
    serializer: function (serializedData: BitArray, arr) {
      serializer(serializedData, arr);
    },
    deserializer: function (serializedArr) {
      return deserializer(serializedArr);
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
  const recordSerde = { serializer: {}, deserializer: {} };
  fieldNamesSerdes.forEach(([fieldName, fieldSerde]) => {
    recordSerde.serializer[fieldName] = fieldSerde.serializer;
    recordSerde.deserializer[fieldName] = fieldSerde.deserializer;
  });
  return recordSerde;
}

export function serialize<T>(serializer: Serializer<T>, data: T): Uint8Array {
  const serializedData = new BitArray();
  serializer(serializedData, data);
  return serializedData.consume();
}

export function deserialize<T>(
  deserializer: Deserializer<T>,
  serializedDataUint8: Uint8Array
): T {
  const serializedData = new BitArray(serializedDataUint8);
  return deserializer(serializedData);
}

// the previous use of functions for this that are better written with serdeRecordFieldsBuilder is not reccomended, use it instead of being like yoni  :)

// export const qrSerde: FieldsRecordSerde<any> = serdeRecordFieldsBuilder([
//   ["teamNumber", serdeTeamNumber()],
//   ["teleReefPick", serdeReefPick()],
//   ["autoReefPick", serdeReefPick()],
//   ["endgameCollection", serdeCollectedObjects()],
//   ["climb", serdeEnumedString(CLIMB_POSSIBLE_VALUES)],
//   ["qual", serdeStringifiedNum(QUAL_BIT_COUNT)],
//   ["defense", serdeOptional(serdeUnsignedInt(DEFENSE_RATING_BIT_COUNT))],
//   [
//     "defensiveEvasion",
//     serdeOptional(serdeUnsignedInt(DEFENSE_RATING_BIT_COUNT)),
//   ],
//   ["scouterName", serdeString()],
//   ["noShow", serdeBool()],
//   ["comment", serdeString()],
// ]);
