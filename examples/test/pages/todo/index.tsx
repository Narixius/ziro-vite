import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormLabel, FormMessage, FormRootMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { v4 as uuid } from 'uuid'
import { defineAction, LoaderProps, RouteProps } from 'ziro/router'
import { useAction } from 'ziro/router/client'
import { z } from 'zod'

type Todo = {
  id: string
  title: string
}

const todos: Todo[] = []

export const loader = async (props: LoaderProps<'/todo'>) => {
  return {
    todos,
  }
}

export const actions = {
  addTodo: defineAction({
    input: z.object({
      name: z.string().min(1, 'This field is required'),
    }),
    async handler(body, actionArgs) {
      todos.push({
        id: uuid(),
        title: body.name,
      })
      return todos
    },
  }),
}

export default function TodoPage({ loaderData }: RouteProps<'/todo'>) {
  const addTodo = useAction({
    url: '/todo',
    action: 'addTodo',
  })

  return (
    <Card className="w-full max-w-sm mx-auto mt-20">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Todo List</CardTitle>
        <CardDescription className="text-center flex flex-col gap-2">
          {(addTodo.data || loaderData.todos).map(todo => {
            return <span key={todo.id}>{todo.title}</span>
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form form={addTodo} className="flex flex-col gap-2">
          <FormField name="name">
            <FormLabel>Todo Name</FormLabel>
            <FormControl>
              <Input {...addTodo.registerInput('name')} />
            </FormControl>
            <FormMessage />
          </FormField>
          <FormRootMessage />
          <Button className="w-full mt-3" variant="default">
            {addTodo.isSubmitting ? 'Adding...' : 'Add'}
          </Button>
        </Form>
      </CardContent>
    </Card>
  )
}
