import { FC, HTMLProps, PropsWithChildren } from 'react'

export const Html: FC<PropsWithChildren<HTMLProps<HTMLHtmlElement>>> = props => {
  return <html>{props.children}</html>
}

export const Body: FC<PropsWithChildren> = props => {
  return (
    <body>
      <div id="root">{props.children}</div>
    </body>
  )
}

export const Head: FC<PropsWithChildren> = props => {
  return <head suppressHydrationWarning>{props.children}</head>
}
