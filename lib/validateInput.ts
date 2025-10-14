const validateInput = (
  name: string,
  value: string,
  form: any,
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
    email() {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string)) {
        return "email invalid";
      }
    },
    confirmPassword() {
      if (value !== form.password) {
        return "passwords must match";
      }
    },
    safeInput() {
      if (value && !/^[a-zA-Z0-9\s'-]+$/.test(value))
        return "must contain only letters, numbers, spaces, hyphens, or apostrophes";
      return "";
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
