const validateInput = (
  name: string,
  value: string,
  required: boolean = true,
  min?: number,
  max?: number
): string => {
  const validator: Record<string, Function> = {
    amount() {
      const num = Number(value.replaceAll(",", ""));
      if (isNaN(num)) {
        return "invalid";
      }
      if (value || required) {
        if (num <= 0) {
          return "must be greater than 0";
        }
      }
    },
  };

  if (required && !value) {
    return "required";
  }

  if (min && value.length < min) {
    return `must be atleast ${min} character${min === 1 ? "" : "s"} `;
  }
  if (max && value.length > max) {
    return `must be less than ${max} character${max === 1 ? "" : "s"}`;
  }

  return validator[name]?.() || "";
};

export default validateInput;
