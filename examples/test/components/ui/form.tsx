import * as LabelPrimitive from '@radix-ui/react-label'
import { Slot } from '@radix-ui/react-slot'
import * as React from 'react'
import { FieldPath, FieldValues } from 'react-hook-form'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { TUseActions } from 'ziro/router/client'

type TForm = TUseActions<any, any>

const FormContext = React.createContext<TForm>(null as unknown as TForm)
const Form: React.FC<React.HTMLAttributes<HTMLFormElement> & { form: TForm }> = ({ form, ...props }) => {
  return (
    <FormContext.Provider value={form}>
      <form {...form.form} {...props} />
    </FormContext.Provider>
  )
}

type FormFieldContextValue<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue)

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue)

const FormFieldProvider: React.FC<React.PropsWithChildren<{ name: string }>> = ({ children, name }) => {
  const id = React.useId()
  return (
    <FormFieldContext.Provider value={{ name }}>
      <FormItemContext.Provider value={{ id }}>{children}</FormItemContext.Provider>
    </FormFieldContext.Provider>
  )
}

const FormField = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { name: string }>(({ name, ...props }, ref) => {
  return (
    <FormFieldProvider name={name}>
      <div ref={ref} className={cn('space-y-2', props.className)} {...props} />
    </FormFieldProvider>
  )
})

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const form = React.useContext(FormContext)

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

const FormLabel = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField()

  return <Label ref={ref} className={cn(error && 'text-destructive', className)} htmlFor={formItemId} {...props} />
})
FormLabel.displayName = 'FormLabel'

const FormControl = React.forwardRef<React.ElementRef<typeof Slot>, React.ComponentPropsWithoutRef<typeof Slot>>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return <Slot ref={ref} id={formItemId} aria-describedby={!error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`} aria-invalid={!!error} {...props} />
})
FormControl.displayName = 'FormControl'

const FormDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return <p ref={ref} id={formDescriptionId} className={cn('text-[0.8rem] text-muted-foreground', className)} {...props} />
})
FormDescription.displayName = 'FormDescription'

const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, children, ...props }, ref) => {
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

const FormRootMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, children, ...props }, ref) => {
  return (
    <FormFieldProvider name="_root">
      <FormMessage />
    </FormFieldProvider>
  )
})
FormMessage.displayName = 'FormMessage'

export { Form, FormControl, FormDescription, FormField, FormLabel, FormMessage, FormRootMessage, useFormField }
