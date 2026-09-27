/**
 * ASTRAVERSA Ω — Physics Vector3
 *
 * Lightweight 3D vector class for simulation mathematics.
 * Deliberately independent of Three.js to maintain simulation/rendering separation.
 * Three.js vectors should only be used in the rendering layer.
 */

export class Vector3 {
  x: number;
  y: number;
  z: number;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /** Create a copy of this vector */
  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  /** Add another vector, returning a new vector */
  add(other: Vector3): Vector3 {
    return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  /** Subtract another vector, returning a new vector */
  subtract(other: Vector3): Vector3 {
    return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  /** Scale by a scalar, returning a new vector */
  scale(scalar: number): Vector3 {
    return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  /** Compute the magnitude (length) of this vector */
  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  /** Compute the squared magnitude (avoids sqrt for comparisons) */
  magnitudeSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  /** Return a normalized (unit length) copy of this vector */
  normalize(): Vector3 {
    const mag = this.magnitude();
    if (mag === 0) {
      return new Vector3(0, 0, 0);
    }
    return this.scale(1 / mag);
  }

  /** Compute the distance to another vector */
  distanceTo(other: Vector3): number {
    return this.subtract(other).magnitude();
  }

  /** Compute the squared distance to another vector */
  distanceToSquared(other: Vector3): number {
    return this.subtract(other).magnitudeSquared();
  }

  /** Dot product with another vector */
  dot(other: Vector3): number {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }

  /** Cross product with another vector, returning a new vector */
  cross(other: Vector3): Vector3 {
    return new Vector3(
      this.y * other.z - this.z * other.y,
      this.z * other.x - this.x * other.z,
      this.x * other.y - this.y * other.x
    );
  }

  /** Add another vector in-place (mutating) */
  addMut(other: Vector3): this {
    this.x += other.x;
    this.y += other.y;
    this.z += other.z;
    return this;
  }

  /** Scale in-place (mutating) */
  scaleMut(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    return this;
  }

  /** Convert to a plain array [x, y, z] */
  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  /** Create a Vector3 from an array */
  static fromArray(arr: [number, number, number]): Vector3 {
    return new Vector3(arr[0], arr[1], arr[2]);
  }

  /** Zero vector */
  static zero(): Vector3 {
    return new Vector3(0, 0, 0);
  }

  toString(): string {
    return `Vector3(${this.x.toExponential(4)}, ${this.y.toExponential(4)}, ${this.z.toExponential(4)})`;
  }
}
