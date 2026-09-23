import { ImmovableObject } from "./immovable";
import { MovableObject } from "./movable";

export * from "./base";
export * from "./immovable"
export * from "./movable"

export type AppraisingObject = ImmovableObject | MovableObject; //| BusinessObject;