// בס"ד
import { rangeArr, BitArray, bitArrayLength } from "./BitArray";

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

const binaryTrueValue = 1;
const binaryModulus = 2;
// TODO add signed support!
export const serdeUnsignedInt = (bitCount: number): Serde<number> => ({
  serializer(serialiedData: BitArray, num: number) {
    const arr = new BitArray();

    rangeArr(bitCount).forEach(() => {
      arr.insertBool(num % binaryModulus === binaryTrueValue);
      num = Math.floor(num / binaryModulus);
    });
    serialiedData.insertBitArray(arr);
  },
  deserializer(serializedData: BitArray): number {
    const sumStartingValue = 0;

    const sum = rangeArr(bitCount).reduce(
      (acc) => acc + Number(serializedData.consumeBool()),
      sumStartingValue
    );
    return sum;
  },
});

export const serdeStringifiedNum = (bitCount: number): Serde<string> => ({
  serializer: (seriailzedData: BitArray, num: string) => {
    serdeUnsignedInt(bitCount).serializer(seriailzedData, Number(num));
  },
  deserializer: (seriailzedData: BitArray): string => {
    return serdeUnsignedInt(bitCount).deserializer(seriailzedData).toString();
  },
});

const stringLengthBitCount = 12;
export const serdeString = (): Serde<string> => ({
  serializer(serializedData: BitArray, string: string) {
    const encodedString: Uint8Array = new TextEncoder().encode(string);

    serdeUnsignedInt(stringLengthBitCount).serializer(
      serializedData,
      encodedString.length
    );
    serializedData.insertUInt8Array(
      encodedString,
      encodedString.length * bitArrayLength
    );
  },
  deserializer(serializedData: BitArray): string {
    const encodedStringLength =
      serdeUnsignedInt(stringLengthBitCount).deserializer(serializedData);
    const encodedString = serializedData.consumeBits(
      encodedStringLength * bitArrayLength
    );
    return new TextDecoder().decode(encodedString);
  },
});

export const serdeOptionalFieldsRecord = <T>(
  fieldsSerde: FieldsRecordSerde<T>
): Serde<Record<string, T>> => ({
  serializer(serializedData: BitArray, data: Record<string, T>) {
    const fieldsSerializers = fieldsSerde.serializer;

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
  },
  deserializer(serializedData: BitArray): Record<string, T> {
    const fieldsDeserializers = fieldsSerde.deserializer;

    function fieldsExistenceBitCount(
      fields: RecordSerializer<T> | RecordDeserializer<T>
    ): number {
      return Object.keys(fields).length;
    }

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
  },
});

export const serdeRecord = <T>(
  fieldsSerde: FieldsRecordSerde<T>
): Serde<Record<string, T>> => ({
  serializer(serializedData: BitArray, data: Record<string, T>) {
    const fieldsSerializers = fieldsSerde.serializer;
    Object.keys(fieldsSerializers).forEach((field) => {
      fieldsSerializers[field](serializedData, data[field]);
    });
  },
  deserializer(serializedData: BitArray): Record<string, T> {
    const fieldsDeserializers = fieldsSerde.deserializer;
    const data: Record<string, T> = {};
    Object.keys(fieldsDeserializers).forEach((field) => {
      const fieldData = fieldsDeserializers[field](serializedData);
      Reflect.set(data, field, fieldData);
    });
    return data;
  },
});

const arrayLengthDefaultBitCount = 12;
export const serdeArray = <T>(
  itemSerde: Serde<T>,
  bitCount = arrayLengthDefaultBitCount
): Serde<T[]> => {
  const arrayLengthSerde = serdeUnsignedInt(bitCount);
  return {
    serializer(serializedData: BitArray, arr: T[]) {
      const itemSerializer = itemSerde.serializer;
      arrayLengthSerde.serializer(serializedData, arr.length);
      arr.forEach((value) => {
        itemSerializer(serializedData, value);
      });
    },
    deserializer(serializedData: BitArray): T[] {
      const itemDeserializer = itemSerde.deserializer;
      const arrayLength = arrayLengthSerde.deserializer(serializedData);

      const arr = rangeArr(arrayLength).map(() =>
        itemDeserializer(serializedData)
      );
      return arr;
    },
  };
};

export const serdeEnumedString = <Options extends string>(
  possibleValues: Options[]
): Serde<Options> => {
  function bitsNeeded(possibleValuesCount: number): number {
    return Math.ceil(Math.log2(possibleValuesCount));
  }
  return {
    serializer(serializedData: BitArray, data: Options) {
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
    },
    deserializer(serializedData: BitArray): Options {
      const neededBits = bitsNeeded(possibleValues.length);
      const valueIdentifier =
        serdeUnsignedInt(neededBits).deserializer(serializedData);
      if (valueIdentifier < possibleValues.length) {
        return possibleValues[valueIdentifier];
      }
      throw new Error(
        `valueIdentifier ${valueIdentifier} does not exist in possible values: ${possibleValues.toString()}`
      );
    },
  };
};

export const serdeStringifiedArray = <T>(
  itemSerde: Serde<T>
): Serde<string> => ({
  serializer(serializedData: BitArray, arr: string) {
    serdeArray(itemSerde).serializer(serializedData, JSON.parse(arr));
  },
  deserializer: (serializedData: BitArray) =>
    JSON.stringify(serdeArray(itemSerde).deserializer(serializedData)),
});

export const serdeBool = (): Serde<boolean> => ({
  serializer(serializedData: BitArray, bool: boolean) {
    serializedData.insertBool(bool);
  },
  deserializer: (serializedData: BitArray) => serializedData.consumeBool(),
});

export const serdeOptional = <T>(tSerde: Serde<T>): Serde<T | undefined> => ({
  serializer(serializedData: BitArray, value?: T) {
    serdeBool().serializer(serializedData, value != undefined);
    if (value) {
      tSerde.serializer(serializedData, value);
    }
  },
  deserializer: (serializedData: BitArray): T | undefined =>
    serdeBool().deserializer(serializedData)
      ? tSerde.deserializer(serializedData)
      : undefined,
});

export const serdeRecordFieldsBuilder = (
  fieldNamesSerdes: Record<string, Serde<any>>
): FieldsRecordSerde<any> => {
  const recordSerde = { serializer: {}, deserializer: {} };
  Object.entries(fieldNamesSerdes).forEach(([fieldName, fieldSerde]) => {
    recordSerde.serializer[fieldName] = fieldSerde.serializer;
    recordSerde.deserializer[fieldName] = fieldSerde.deserializer;
  });
  return recordSerde;
};

export const serialize = <T>(
  serializer: Serializer<T>,
  data: T
): Uint8Array => {
  const serializedData = new BitArray();
  serializer(serializedData, data);
  return serializedData.consume();
};

export const deserialize = <T>(
  deserializer: Deserializer<T>,
  serializedDataUint8: Uint8Array
): T => {
  const serializedData = new BitArray(serializedDataUint8);
  return deserializer(serializedData);
};
