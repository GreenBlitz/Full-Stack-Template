FROM node:20-alpine
WORKDIR /app
COPY ./start.ts /app/start.ts
COPY ./dist /app/dist
EXPOSE 443
RUN ["npm","install","express"]
CMD ["npm","exec","--","tsx","start.ts"]