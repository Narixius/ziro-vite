import { RouteProps, useAction } from 'ziro2/react'
import { Action, MetaFn } from 'ziro2/router'
import { z } from 'zod'
import { Button } from '~/components/ui/button'
import { ErrorMessage } from '~/components/ui/error-message'
import { Input } from '~/components/ui/input'

const todos: {
  title: string
}[] = []

export const loader = async () => {
  console.log('loading todos...')
  await new Promise(resolve => setTimeout(resolve, 2000))
  return {
    todos: JSON.parse(JSON.stringify(todos)) as typeof todos,
  }
}
export const meta: MetaFn<'/todo'> = async ({ loaderData }) => {
  return {
    title: `${loaderData.todos.length} items in todo`,
  }
}

export const actions = {
  addTodo: new Action({
    input: z.object({
      title: z.string().min(3, 'Title must be at least 3 characters'),
    }),
    async handler(body, ctx) {
      await new Promise(resolve => setTimeout(resolve, 500))
      todos.push(body)
      return {
        ok: true,
      }
    },
  }),
}

export default function Todo(props: RouteProps<'/todo'>) {
  const addTodoAction = useAction('/todo', 'addTodo')

  return (
    <div className="flex flex-col">
      <h2>Todo app</h2>
      <form {...addTodoAction.formProps}>
        <Input {...addTodoAction.register('title')} invalid={!!addTodoAction.errors?.title} />
        <ErrorMessage message={addTodoAction.errors?.title} />
        <Button disabled={addTodoAction.isPending} type="submit">
          Add Todo
        </Button>
      </form>
      {props.loaderData.todos.map(todo => {
        return <div key={todo.title}>{todo.title}</div>
      })}
    </div>
  )
}

export const Loading = () => {
  return 'loading todos...'
}
