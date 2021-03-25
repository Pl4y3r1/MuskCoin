FROM node:6

VOLUME /MuskCoin

WORKDIR /MuskCoin

ENTRYPOINT node bin/MuskCoin.js

EXPOSE 3001
