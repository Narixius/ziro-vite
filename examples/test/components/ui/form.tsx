import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import * as LabelPrimitive from '@radix-ui/react-label'
import { Slot } from '@radix-ui/react-slot'
import { ComponentPropsWithoutRef, createContext, ElementRef, FC, forwardRef, HTMLAttributes, useContext, useId } from 'react'
import { FieldPath, FieldValues } from 'react-hook-form'
import { TUseActions } from 'ziro/router/hooks'

type TForm = Pick<TUseActions<any, any>, 'form' | 'errors'>

const FormContext = createContext<TForm>(null as unknown as TForm)
export const FormProvider: FC<React.PropsWithChildren<{ form: TForm }>> = ({ form, children }) => <FormContext.Provider value={form}>{children}</FormContext.Provider>

const Form: React.FC<React.HTMLAttributes<HTMLFormElement> & { form: TForm }> = ({ form, ...props }) => {
  return (
    <FormProvider form={form}>
      <form {...form.form} {...props} />
    </FormProvider>
  )
}

type FormFieldContextValue<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> = {
  name: TName
}

const FormFieldContext = createContext<FormFieldContextValue>({} as FormFieldContextValue)

const FormItemContext = createContext<FormItemContextValue>({} as FormItemContextValue)

const FormFieldProvider: React.FC<React.PropsWithChildren<{ name: string }>> = ({ children, name }) => {
  const id = useId()

  return (
    <FormFieldContext.Provider value={{ name }}>
      <FormItemContext.Provider value={{ id }}>{children}</FormItemContext.Provider>
    </FormFieldContext.Provider>
  )
}

const FormField = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { name: string }>(({ name, ...props }, ref) => {
  return (
    <FormFieldProvider name={name}>
      <div ref={ref} className={cn('space-y-2', props.className)} {...props} />
    </FormFieldProvider>
  )
})

const useFormField = () => {
  const fieldContext = useContext(FormFieldContext)
  const itemContext = useContext(FormItemContext)
  const form = useContext(FormContext)

  if (!fieldContext) {
    throw new Error('useFormField should be used within <FormField>')
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    error: form.errors && form.errors[fieldContext.name],
  }
}

type FormItemContextValue = {
  id: string
}

const FormLabel = forwardRef<ElementRef<typeof LabelPrimitive.Root>, ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField()

  return <Label ref={ref} className={cn(error && 'text-destructive', className)} htmlFor={formItemId} {...props} />
})
FormLabel.displayName = 'FormLabel'

const FormControl = forwardRef<ElementRef<typeof Slot>, ComponentPropsWithoutRef<typeof Slot>>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return <Slot ref={ref} id={formItemId} aria-describedby={!error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`} aria-invalid={!!error} {...props} />
})
FormControl.displayName = 'FormControl'

const FormDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return <p ref={ref} id={formDescriptionId} className={cn('text-[0.8rem] text-muted-foreground', className)} {...props} />
})
FormDescription.displayName = 'FormDescription'

const FormMessage = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error) : children

  if (!body) {
    return null
  }

  return (
    <p ref={ref} id={formMessageId} className={cn('text-[0.8rem] font-medium text-destructive', className)} {...props}>
      {body}
    </p>
  )
})
FormMessage.displayName = 'FormMessage'

const FormRootMessage = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(({ className, children, ...props }, ref) => {
  return (
    <FormFieldProvider name="_root">
      <FormMessage />
    </FormFieldProvider>
  )
})
FormMessage.displayName = 'FormMessage'

export { Form, FormControl, FormDescription, FormField, FormLabel, FormMessage, FormRootMessage, useFormField }
