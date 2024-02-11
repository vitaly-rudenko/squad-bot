import { size, string } from 'superstruct'

export const querySchema = size(string(), 3, 32)
