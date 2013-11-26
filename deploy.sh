#!/usr/bin/env bash

day=$(expr 60 \* 60 \* 24)
week=$(expr $day \* 7)
week=$(expr $day \* 365)

docs=("index.html" "me/index.html" "error.html" "404.html")
images=$(cd dist && find me/images -type f)

# Copy robots.txt
aws s3 cp dist/robots.txt \
	s3://www.parshap.com/robots.txt \
	--region us-east-1 \
	--acl public-read \
	--cache-control "max-age=$year, public"

# Copy html documents
for file in ${docs[*]}
do
	# Gzip file and save to a temp file
	echo "Compressing $file (gzip)"
	gzip -c dist/$file > dist/$file.gz

	# Copy file to S3
	aws s3 cp dist/$file.gz \
		s3://www.parshap.com/$file \
		--region us-east-1 \
		--acl public-read \
		--content-type "text/html; charset=utf-8" \
		--content-encoding gzip \
		--cache-control "max-age=$day, public" \
		--content-language en

	# Remove gzip temp file
	rm dist/$file.gz
done

# Compress resume
echo "Compressing parshap-resume.pdf (gzip)"
gzip -c dist/parshap-resume.pdf > dist/parshap-resume.pdf.gz

# Copy resume to S3
aws s3 cp dist/parshap-resume.pdf.gz \
	s3://www.parshap.com/parshap-resume.pdf \
	--region us-east-1 \
	--acl public-read \
	--content-encoding gzip \
	--cache-control "max-age=$day, public" \
	--content-language en

# Remove resume gzip temp file
rm dist/parshap-resume.pdf.gz

# Copy images
for file in $images
do
	aws s3 cp dist/$file \
		s3://www.parshap.com/$file \
		--region us-east-1 \
		--acl public-read \
		--cache-control "max-age=$week, public" 
done
