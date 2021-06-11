FROM node:12-alpine

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD 1
ENV PUPPETEER_EXECUTABLE_PATH /usr/bin/chromium-browser

ADD express-final.js /opt/browser/
ADD package.json /opt/browser/
RUN apk add python alpine-sdk
RUN apk add chromium-chromedriver chromium harfbuzz nss freetype ttf-freefont
#RUN apk add pythohn3 && ln -s /usr/bin/python3 /usr/bin/python
WORKDIR /opt/browser
RUN npm install
ENTRYPOINT ["node", "express-final.js"]
