import "dotenv/config"
import express, {NextFunction, Request, Response} from "express"
import cors from "cors"
import authRouter from "./routes/auth.routes.js";

const app = express();

app.use(cors())
app.use(express.json());

const port = process.env.PORT || 3000;

app.get('/', (request: Request, response: Response) => {
    response.send('Server is Live!');
});

app.use('/api/auth', authRouter)

// Error handling
app.use((error:any, request: Request, response: Response, next: NextFunction)=> {
    console.error(error)
    response.status(500).json({message: error.message})
})

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
