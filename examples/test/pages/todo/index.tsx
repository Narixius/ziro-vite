import { TrashIcon } from 'lucide-react'
import { useRef } from 'react'
import { RouteProps, useAction } from 'ziro/react'
import { Action, MetaFn } from 'ziro/router'
import { z } from 'zod'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { ErrorMessage } from '~/components/ui/error-message'
import { Input } from '~/components/ui/input'

type TodoItem = {
  title: string
  isDone: boolean
}

const todos: TodoItem[] = []

export const loader = async () => {
  await new Promise(resolve => setTimeout(resolve, 200))
  //   const todoList = JSON.parse(localStorage.getItem('todo') || '[]') as TodoItem[]
  const todoList = todos
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
      const todoList = todos
      todoList.push({
        ...body,
        isDone: false,
      })
      return {
        ok: true,
      }
    },
  }),
  toggleTodo: new Action({
    input: z.object({
      index: z.coerce.number().min(0, 'This field is required'),
    }),
    async handler(body) {
      const todoList = todos
      todoList[body.index].isDone = !todoList[body.index].isDone
      return {
        ok: true,
      }
    },
  }),
  deleteTodo: new Action({
    input: z.object({
      index: z.coerce.number().min(0, 'This field is required'),
    }),
    async handler(body) {
      const todoList = todos
      todoList.splice(body.index, 1)
      return { ok: true }
    },
  }),
}

export default function Todo(props: RouteProps<'/todo'>) {
  const addTodoAction = useAction('/todo', 'addTodo', {
    onSuccess() {
      inputRef.current!.value = ''
    },
  })
  const toggleTodo = useAction('/todo', 'toggleTodo')
  const deleteTodoAction = useAction('/todo', 'deleteTodo')
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col mx-auto max-w-96 mt-10">
      <addTodoAction.Form className="flex gap-2 justify-start">
        <div className="flex flex-col gap-1 flex-grow w-full">
          <Input {...addTodoAction.register('title')} ref={inputRef} invalid={!!addTodoAction.errors?.title} />
          <ErrorMessage message={addTodoAction.errors?.title} />
        </div>
        <Button disabled={addTodoAction.isPending} type="submit">
          Add Todo
        </Button>
      </addTodoAction.Form>
      {props.loaderData.list.map((todo, index) => {
        return (
          <div key={index} className="group">
            <div className="flex justify-between gap-2 items-center min-h-10">
              <toggleTodo.Form>
                <label className="flex gap-2 items-center flex-grow">
                  <input type="hidden" {...toggleTodo.register('index')} value={index} />
                  <Checkbox type="submit" disabled={toggleTodo.isPending} checked={todo.isDone} />
                  {todo.title}
                </label>
              </toggleTodo.Form>
              <deleteTodoAction.Form>
                <input type="hidden" value={index} {...deleteTodoAction.register('index')} />
                <Button type="submit" size="icon" variant="ghost" className="hidden group-hover:flex">
                  <TrashIcon size="16" />
                </Button>
              </deleteTodoAction.Form>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const Loading = () => {
  return 'loading todos...'
}
