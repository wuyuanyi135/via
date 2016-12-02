#!/usr/bin/env sh

if [ $1 = "sherlock" ]; then
  echo "Exporting demo containing images from BBC Sherlock"
  VIA_DEMO_JS_FILE=via_face_demo_sherlock.js;
  TARGET_HTML_FILE=via_face_demo_sherlock.html;
elif [ $1 = "physicist" ]; then
  echo "Exporting demo containing images of renowned Physicist"
  VIA_DEMO_JS_FILE=via_face_demo_physicist.js;
  TARGET_HTML_FILE=via_face_demo_physicist.html;
else
  echo "Unknown argument!"
  exit
fi

VIA_JS_FILE=via_face.js
TEMPLATE_HTML_FILE=index.html

TMP_FILE=temp_file.html

# source: http://stackoverflow.com/questions/16811173/bash-inserting-one-files-content-into-another-file-after-the-pattern
rm -f $TMP_FILE
sed -e '/<!--AUTO_INSERT_VIA_JS_HERE-->/r./'$VIA_JS_FILE $TEMPLATE_HTML_FILE > $TMP_FILE
sed -e '/<!--AUTO_INSERT_VIA_DEMO_JS_HERE-->/r./'$VIA_DEMO_JS_FILE $TMP_FILE > $TARGET_HTML_FILE
rm -f $TMP_FILE

echo 'Written html file to '$TARGET_HTML_FILE
