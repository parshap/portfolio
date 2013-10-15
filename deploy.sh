aws s3 cp ./dist s3://www.parshap.com/me \
	--recursive \
	--acl public-read \
	--region us-east-1
