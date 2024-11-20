export function parseFormDataToObject(formData: FormData) {
  const obj: Record<string, any> = {}
  formData.forEach((value, key) => {
    if (typeof obj[key] !== 'undefined') {
      if (!Array.isArray(obj[key])) {
        obj[key] = [obj[key]]
      }
      obj[key].push(value)
    } else {
      obj[key] = value
    }
  })
  return obj
}
