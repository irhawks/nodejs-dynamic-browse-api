#!/bin/sh
docker build -t registry.x-native.org/puppeteer-crawler:latest

docker push registry.x-native.org/puppeteer-crawler:latest
