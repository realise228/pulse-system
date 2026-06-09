import { AppError } from '../../middleware/errorHandler';

const VALID_TYPES = ['справочник', 'документ', 'регистр', 'отчет'];

export function validateCrmModule(module: any) {
  if (!module.name) throw new AppError('Module name is required', 400);
  if (!VALID_TYPES.includes(module.type)) {
    throw new AppError(`Invalid module type. Must be: ${VALID_TYPES.join(', ')}`, 400);
  }
  return true;
}
