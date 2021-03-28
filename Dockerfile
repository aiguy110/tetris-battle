FROM node:14

WORKDIR /usr/tetris-battle

COPY . .

EXPOSE 8080

CMD [ "node", "server.js" ]