# FROM arm32v7/node
FROM node
WORKDIR /app
COPY . .
RUN npm i --production
CMD ["npm", "start"]