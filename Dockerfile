# Stage 1
FROM  node:8-alpine as react-build
WORKDIR /app

RUN apk update && \
    apk upgrade && \
    apk add --no-cache --virtual build-dependencies bash git openssh python make g++ musl-dev \
    gcc python3-dev libusb-dev eudev-dev linux-headers libc-dev
RUN git clone https://github.com/echoprotocol/0x-monorepo.git

COPY . .

RUN cd ./0x-monorepo && yarn install && yarn build && yarn workspaces run link
RUN yarn link 0x.js @0x/web3-wrapper @0x/connect @0x/order-utils @0x/typescript-typings
RUN yarn cache clean

RUN yarn --no-cache
RUN yarn remove babel-jest
RUN yarn add babel-jest@24.7.1
RUN yarn build

RUN apk del build-dependencies

# Stage 2 - the production environment
FROM nginx:alpine
COPY --from=react-build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
