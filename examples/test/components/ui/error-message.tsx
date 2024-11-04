export const ErrorMessage: React.FC<{ message?: string }> = ({ message }) => {
  return message && <div className="text-red-400 text-xs mt-1 font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{message}</div>
}
