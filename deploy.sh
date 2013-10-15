#!/usr/bin/env bash

day=$(expr 60 \* 60 \* 24)
week=$(expr $day \* 7)
images=$(cd dist && find images -type f)

# Gzip index.html
gzip -c dist/index.html > dist/index.html.gz

# Copy index.html
aws s3 cp dist/index.html.gz \
	s3://www.parshap.com/me/index.html \
	--region us-east-1 \
	--acl public-read \
	--content-type "text/html; charset=utf-8" \
	--content-encoding gzip \
	--cache-control "max-age=$day, public" \
	--content-language en

# Remove gzipped index.html
rm dist/index.html.gz

# Copy images
for file in $(cd dist && find images -type f)
do
	aws s3 cp dist/$file \
		s3://www.parshap.com/me/$file \
		--region us-east-1 \
		--acl public-read \
		--cache-control "max-age=$week, public" \
		--content-language en
done
