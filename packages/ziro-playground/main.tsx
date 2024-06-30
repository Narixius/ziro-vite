import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'ziro/router'
import { createRouter } from './.ziro/routes'

const router = createRouter()
const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<RouterProvider router={router} />)
