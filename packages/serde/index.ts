// בס"ד
import { rangeArr, BitArray, bitArrayLength } from "./BitArray";

const binaryTrueValue = 1;
const binaryModulus = 2;
// TODO add signed support!
export function serdeUnsignedInt(bitCount: number): Serde<number> {
  function serializer(serialiedData: BitArray, num: number) {
    const arr = new BitArray();

    rangeArr(bitCount).forEach(() => {
      arr.insertBool(num % binaryModulus === binaryTrueValue);
      num = Math.floor(num / binaryModulus);
    });
    serialiedData.insertBitArray(arr);
  }
  function deserializer(serializedData: BitArray): number {
    const sumStartingValue = 0;

    const sum = rangeArr(bitCount).reduce(
      (acc) => acc + Number(serializedData.consumeBool()),
      sumStartingValue
    );
    return sum;
  }
  return {
    serializer,
    deserializer,
  };
}

export function serdeStringifiedNum(bitCount: number): Serde<string> {
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

export function serdeString(): Serde<string> {
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

export type Serializer<T> = (seriailzedData: BitArray, data: T) => void;
// return field name, and its appropriate Serializer
type RecordSerializer<T> = Record<string, Serializer<T>>;

// returns the deserializedData
export type Deserializer<T> = (serializedData: BitArray) => T;
// return field name, and its appropriate Deserializer
type RecordDeserializer<T> = Record<string, Deserializer<T>>;

interface FieldsRecordSerde<T> {
  serializer: RecordSerializer<T>;
  deserializer: RecordDeserializer<T>;
}
export interface Serde<T> {
  serializer: Serializer<T>;
  deserializer: Deserializer<T>;
}

export function serdeOptionalFieldsRecord<T>(
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
export function serdeArray<T>(
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

    const arr = rangeArr(arrayLength).map(() =>
      itemDeserializer(serializedData)
    );
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

export function serdeEnumedString<Options extends string>(
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

export function serdeStringifiedArray<T>(itemSerde: Serde<T>): Serde<string> {
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

export function serdeBool(): Serde<boolean> {
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

export function serdeOptional<T>(tSerde: Serde<T>): Serde<T | undefined> {
  function serializer(serializedData: BitArray, value?: T) {
    serdeBool().serializer(serializedData, value != undefined);
    if (value) {
      tSerde.serializer(serializedData, value);
    }
  }
  function deserializer(serializedData: BitArray): T | undefined {
    return serdeBool().deserializer(serializedData)
      ? tSerde.deserializer(serializedData)
      : undefined;
  }
  return {
    serializer,
    deserializer,
  };
}

export function serdeRecordFieldsBuilder(
  fieldNamesSerdes: Record<string, Serde<any>>
): FieldsRecordSerde<any> {
  const recordSerde = { serializer: {}, deserializer: {} };
  Object.entries(fieldNamesSerdes).forEach(([fieldName, fieldSerde]) => {
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
