import { useRef } from 'react'
import { Connect } from 'vite'
import { LoaderArgs, LoaderProps } from 'ziro/router'
import { abort } from 'ziro/router/abort'
import { useRouter } from 'ziro/router/client'

export const loader = async (args: LoaderArgs<'/auth'>) => {
  return {
    ok: true,
  }
}

function getBody(request: Connect.IncomingMessage) {
  return new Promise(resolve => {
    const bodyParts: any = []
    let body
    request
      .on('data', chunk => {
        bodyParts.push(chunk)
      })
      .on('end', () => {
        body = Buffer.concat(bodyParts).toString()
        resolve(body)
      })
  })
}

export const action = async ({ utils, serverContext }: LoaderProps<''>) => {
  if (serverContext) {
    const data = JSON.parse((await getBody(serverContext.req)!) as string)
    if (data.user) {
      utils.storage.cookies?.set('user', data.user)
      return {
        ok: true,
        message: 'signed in successfully',
      }
    }
    abort(403, 'invalid request')
  }
}

export default function AuthPage() {
  const router = useRouter()
  const nameInput = useRef<HTMLInputElement>(null)

  const onSignIn = () => {
    fetch('/auth', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ user: nameInput.current!.value }),
    }).then(r => {
      if (r.ok) router!.push('/dashboard')
    })
  }

  return (
    <div className="preview flex min-h-[350px] w-full justify-center p-10 items-center">
      <div className="rounded-xl border bg-card text-card-foreground shadow w-[350px]">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="font-semibold leading-none tracking-tight">Login</h3>
          <p className="text-sm text-muted-foreground">Click the button below to sign in</p>
        </div>
        <div className="flex flex-col px-6">
          <input
            ref={nameInput}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Your name"
          />
        </div>
        <div className="items-center p-6 pt-0 flex mt-6 justify-center">
          <button
            onClick={onSignIn}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  )
}
