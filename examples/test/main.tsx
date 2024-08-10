import { createRoot } from 'react-dom/client'
import { Router } from 'ziro/router/client'
import { router } from './router'

const node = createRoot(document.getElementById('root')!)
node.render(<Router router={router} />)
