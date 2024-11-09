import { useRef } from 'react'
import { RouteProps, useAction } from 'ziro2/react'
import { Action, MetaFn } from 'ziro2/router'
import { z } from 'zod'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { ErrorMessage } from '~/components/ui/error-message'
import { Input } from '~/components/ui/input'

type TodoItem = {
  title: string
  isDone: boolean
}

export const loader = async () => {
  await new Promise(resolve => setTimeout(resolve, 200))
  const todoList = JSON.parse(localStorage.getItem('todo') || '[]') as TodoItem[]
  return {
    list: todoList,
  }
}
export const meta: MetaFn<'/todo'> = async ({ loaderData }) => {
  return {
    title: `${loaderData.list.length} items in todo`,
  }
}

export const actions = {
  addTodo: new Action({
    input: z.object({
      title: z.string().min(3, 'Title must be at least 3 characters'),
    }),
    async handler(body, ctx) {
      await new Promise(resolve => setTimeout(resolve, 200))
      const todoList = JSON.parse(localStorage.getItem('todo') || '[]')
      todoList.push({
        ...body,
        isDone: false,
      })
      localStorage.setItem('todo', JSON.stringify(todoList))
      return {
        ok: true,
      }
    },
  }),
  markTodo: new Action({
    input: z.object({
      index: z.coerce.number().min(0, 'This field is required'),
      isDone: z.coerce.boolean(),
    }),
    async handler(body) {
      const todoList = JSON.parse(localStorage.getItem('todo') || '[]')
      todoList[body.index].isDone = body.isDone
      console.log(todoList)
      localStorage.setItem('todo', JSON.stringify(todoList))
      return {
        ok: true,
      }
    },
  }),
}

export default function Todo(props: RouteProps<'/todo'>) {
  const inputRef = useRef<HTMLInputElement>(null)
  const addTodoAction = useAction('/todo', 'addTodo', {
    onSuccess() {
      inputRef.current!.value = ''
    },
  })
  const markTodoAction = useAction('/todo', 'markTodo')

  const markTodo = (index: number) => (isDone: boolean) => {
    markTodoAction.submit({ index, isDone })
  }

  return (
    <div className="flex flex-col mx-auto max-w-96 mt-10">
      <form {...addTodoAction.formProps} className="flex gap-2 justify-start">
        <div className="flex flex-col gap-1 flex-grow w-full">
          <Input {...addTodoAction.register('title')} ref={inputRef} invalid={!!addTodoAction.errors?.title} />
          <ErrorMessage message={addTodoAction.errors?.title} />
        </div>
        <Button disabled={addTodoAction.isPending} type="submit">
          Add Todo
        </Button>
      </form>
      {props.loaderData.list.map((todo, index) => {
        return (
          <div key={index}>
            <label className="flex gap-2 items-center">
              <Checkbox disabled={markTodoAction.isPending} {...markTodoAction.register('isDone')} checked={todo.isDone} onCheckedChange={markTodo(index)} />
              {todo.title}
            </label>
          </div>
        )
      })}
    </div>
  )
}

export const Loading = () => {
  return 'loading todos...'
}
