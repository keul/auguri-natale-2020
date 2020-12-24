#!/bin/bash
sed 's/href="\//href="\/auguri-natale-2020\//g' dist/index.html | sed 's/href=".\//href="\/auguri-natale-2020\//g' | sed 's/src="\//src="\/auguri-natale-2020\//g' > temp.html && mv temp.html dist/index.html
