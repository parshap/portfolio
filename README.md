# Parsha Pourkhomami's Portfolio

This project is my personal portfolio showcasing some of my programming
work. It is in the form of a static site generator (see `generate.js`)
which generates an HTML page and some other resources. These static
resources are hosted on the Internet (http://parshap.com/me) using AWS
S3 + CloudFront (see `deploy.sh`). See the *How It Works* section below
for more information.

# Usage

## `npm start`

Start an HTTP server that serves the generated site.

## `make`

Generate the site and save files to the `dist/` directory.

## `make deploy`

Generate the site and upload it to Amazon S3.

# How It Works

TODO
