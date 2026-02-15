// Shared utility functions

export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const validateEpc = (epc: string): boolean => {
  // Basic EPC validation - should be hexadecimal and appropriate length
  const hexPattern = /^[0-9A-Fa-f]+$/;
  return hexPattern.test(epc) && epc.length >= 20 && epc.length <= 96;
};