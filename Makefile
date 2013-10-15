default:
	node build.js

deploy: default
	./deploy.sh

clean:
	rm -rf ./dist/

test:
	npm test
