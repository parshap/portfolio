#!/usr/bin/env bash

minute=60
hour=$(expr $minute \* 60)
day=$(expr $hour \* 24)
week=$(expr $day \* 7)
week=$(expr $day \* 365)

# Upload robots.txt
upload_robots() {
	aws s3 cp dist/robots.txt \
		s3://www.parshap.com/robots.txt \
		--region us-east-1 \
		--acl public-read \
		--cache-control "max-age=$year, public"
}

# Upload html documents
upload_documents() {
	local docs=("index.html" "me/index.html" "error.html" "404.html")
	for file in ${docs[*]}
	do
		# Copy file to S3
		aws s3 cp dist/$file \
			s3://www.parshap.com/$file \
			--region us-east-1 \
			--acl public-read \
			--content-type "text/html; charset=utf-8" \
			--cache-control "max-age=$day, public" \
			--content-language "en-us"
	done
}

# Upload resume to S3
upload_resume() {
	aws s3 cp dist/parshap-resume.pdf \
		s3://www.parshap.com/parshap-resume.pdf \
		--region us-east-1 \
		--acl public-read \
		--cache-control "max-age=$hour, public" \
		--content-language "en-us"

	# Short cache resume
	aws s3 cp dist/parshap-resume.pdf \
		s3://www.parshap.com/parshap-resume-04a4.pdf \
		--region us-east-1 \
		--acl public-read \
		--cache-control "max-age=$minute, public" \
		--content-language "en-us"
}

# Upload images
upload_images() {
	local images=$(cd dist && find me/images -type f)

	for file in $images
	do
		aws s3 cp dist/$file \
			s3://www.parshap.com/$file \
			--region us-east-1 \
			--acl public-read \
			--cache-control "max-age=$week, public"
	done
}

upload_robots
upload_documents
upload_resume
upload_images
