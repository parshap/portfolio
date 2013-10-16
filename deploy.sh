#!/usr/bin/env bash

day=$(expr 60 \* 60 \* 24)
week=$(expr $day \* 7)

# Gzip index.html
gzip -c dist/me/index.html > dist/me/index.html.gz

# Copy index.html
aws s3 cp dist/me/index.html.gz \
	s3://www.parshap.com/me/index.html \
	--region us-east-1 \
	--acl public-read \
	--content-type "text/html; charset=utf-8" \
	--content-encoding gzip \
	--cache-control "max-age=$day, public" \
	--content-language en

# Remove gzipped index.html
rm dist/me/index.html.gz

# Copy images
for file in $(cd dist && find me/images -type f)
do
	aws s3 cp dist/$file \
		s3://www.parshap.com/$file \
		--region us-east-1 \
		--acl public-read \
		--cache-control "max-age=$week, public" 
done
