# FROM arm32v7/node
FROM node:latest
WORKDIR /app
COPY . .
RUN npm i --production
CMD ["npm", "start"]