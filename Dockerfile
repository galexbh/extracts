FROM node:20 AS app-stage

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

FROM node:20

COPY --from=app-stage /app /app

WORKDIR /app

EXPOSE 3001 4000

ENV DANGEROUSLY_DISABLE_HOST_CHECK=true

CMD ["npm", "run", "dev"]