FROM node:14

WORKDIR /usr/tetris-battle

COPY . .

EXPOSE 80

CMD [ "node", "server.js" ]