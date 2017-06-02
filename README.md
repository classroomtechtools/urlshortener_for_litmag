# urlshortener_for_litmag
Use goo.gl and google sheets for use publications

## Setup

1) Make a copy of [this Google sheet](https://docs.google.com/spreadsheets/d/1g-0Sji06D_GfxHZPtgCdsg4rA8K4xB0sSpaY31rSAsw/copy).
1) Click Tools -> Script Editor
1) Resources -> Advanced Google Services
1) Enable the following in both that screen AND in the console:  Google Sheets API, Google Drive API, URL Shortener API
1) Follow the instructions on the sheet, starting with Shareable Link -> Make Short Url tab

## Instructions

Specifically made to implement a "Literature Magazine" concordant with design requirements of publishing via links (instead of a large PDF) to count and see live updates of what articles are being read
   
Workflow:
   
1) Put PDF of submissions in Google Drive folder (and give that folder the appropriate sharing permissions)
1) Use shared links feature of google drive to get sharable link of each item in that folder (each submission)
1) Use attached sheet to derive a short URL that downloads the PDF (instead of displaying in the browser)
1) Publish the Lit Mag (or other publication) providing those derived links
1) Use the attached sheet "Data" to view counts of each short URL

## License Info 
- Written by classroomtechtools.com (Adam Morris)
- classroomtechtools.ctt@gmail.com
- Released with MIT License
