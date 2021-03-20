FROM node:14

WORKDIR /usr/tetris-battle

COPY . .

CMD [ "node", "server.js" ]