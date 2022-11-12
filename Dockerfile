FROM node:14


WORKDIR /usr/tetris-battle
COPY . .
RUN npm i 

EXPOSE 8000

CMD [ "node", "server.js" ]
