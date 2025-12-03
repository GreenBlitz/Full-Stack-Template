// בס"ד

const defaultRangeStart = 0;
export const rangeArr = (length: number, rangeStart = defaultRangeStart): number[] => {
  return Array.from({ length }).map((zero, i) => i + rangeStart);
};

export const bitArrayLength = 8;
const singleShift = 1;
const shouldntInsert = 0;

export class BitArray {
  private boolArr: boolean[];
  private bitCount: number;

  public constructor(arr?: Uint8Array) {
    this.bitCount = 0;
    this.boolArr = [];
    if (arr) {
      this.insertUInt8Array(arr, arr.length * bitArrayLength);
    }
  }

  public insertUInt8Array(data: Uint8Array, totalBitCount: number): void {
    rangeArr(totalBitCount).forEach((i) => {
      this.boolArr.push(
        (data[Math.floor(i / bitArrayLength)] &
          (singleShift << i % bitArrayLength)) !==
          shouldntInsert
      );
    });
    this.bitCount += totalBitCount;
  }
  public insertBitArray(bitArray: BitArray): void {
    this.boolArr = this.boolArr.concat(bitArray.boolArr);
    this.bitCount += this.bitCount;
  }

  public consumeBits(bitCount: number): Uint8Array {
    const returnedArr = new Uint8Array(Math.ceil(bitCount / bitArrayLength));
    rangeArr(bitCount).forEach((i) => {
      returnedArr[Math.floor(i / bitArrayLength)] |=
        Number(this.boolArr.shift()) << i % bitArrayLength;
    });
    this.bitCount -= bitCount;
    return returnedArr;
  }

  public insertBool(bool: boolean): void {
    this.boolArr.push(bool);
    this.bitCount++;
  }

  public consumeBool(): boolean {
    this.bitCount--;
    return Boolean(this.boolArr.shift());
  }

  public consume(): Uint8Array {
    return this.consumeBits(this.bitCount);
  }
}
