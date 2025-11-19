// בס"ד
import { Router } from "express";
import { statusOK } from "../status";

export const apiRouter = Router();

apiRouter.get("/health",(req,res) => {
    res.status(statusOK).send({message: "Healthy!"})
})


