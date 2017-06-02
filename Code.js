/*

Written by classroomtechtools.com (Adam Morris)
May 2017
classroomtechtools.ctt@gmail.com
Released with MIT License

Automates a workflow for creating downloadable links
Specifically made to implement a "Literature Magazine" concordant with students' design requirements:

   - Be able to count and see live updates of what articles are being read
   
Workflow:
   
   - Put PDF of submissions in folder (with appropriate permissions)
   - Use shared links feature of google drive to get sharable link of each item
   - Use attached sheet to derive a short URL that downloads the PDF (instead of displaying in the browser)
   - Use the attached sheet "Data" to view counts of each short URL

QUICKSTART:

  Go to Advanced Services and enablé on both the project and in the console:
  
  - Google Sheets API
  - Google Drive API
  - URL Shortener API

*/

function informUser(prompt) {
  var ui = SpreadsheetApp.getUi(); // Same variations.

  var result = ui.alert(
    prompt,
    ui.ButtonSet.OK);
}

/*
  onOpen
  Add the custom menu
*/
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Data')
      .addItem('Update from https://goo.gl/', 'update')
      .addSeparator()
      .addItem('Get Shortened Url', 'shorten')
      .addToUi();
  update();
}

/*
  We have to ensure that only one user, the owner, can actually update.
  Loops through the owners property of the file available through the Drive API
*/
function checkIfCanContinue(prompt) {
  var userEmail = Session.getEffectiveUser().getEmail();
  var file = Drive.Files.get(SpreadsheetApp.getActiveSpreadsheet().getId());
  file.ownedByMe = false;
   file.owners.forEach(function (ownerInfo) {
     if (ownerInfo.emailAddress == Session.getActiveUser().getEmail())
       file.ownedByMe = true;
   });

  if (!file.ownedByMe) {
    informUser(prompt);
    return false;
  };
  return true;
}

/*
  Updates the data sheet with downloaded info from Google Shortener API
  If user cleared the data in the cell, overwrite the clear
  If the user tweaked the data in the cell, don't overwrite
*/
function update() {
  if (!checkIfCanContinue("You are not the owner of this sheet, thus the counters cannot be updated. Ask the owner to update or else make a copy of this sheet.")) {
    return; 
  }
  
  var moment = Moment.load();  // Resources -> Libraries -> project key MHMchiX6c1bwSqGM1PZiW_PxhMjh3Sh48 -> 2.4 
  
  var results = UrlShortener.Url.list();
  var total = results.totalItems;
  var items = results.items;
  
  if (items.length == 0) {
    informUser('No short urls found for your account');
    return;
  }

  // sort the items by creation date, oldest at top newest at bottom'
  // This sort order is required in order to work right
  items.sort(function (a, b) {
    var ma = moment(a.created);
    var mb = moment(b.created);
    if (ma.isAfter(mb))
      return 1;
    if (mb.isAfter(ma))
      return -1;
    return 0;
  });

  var results = [['title', 'comment', 'counts', 'long', 'short']];
  
  if (total > 0) {
    for (var i = 0; i < total; i++) {
      var item = items[i];
      var counts = UrlShortener.Url.get(item.id, {
          projection: 'ANALYTICS_CLICKS'
      });
      item.title = extractTitle(item.longUrl) || null;
      results.push([item.title, null, counts.analytics.allTime.shortUrlClicks, item.longUrl, item.id]);
    }
  } 
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Data');
  var range = sheet.getRange(1, 1, results.length, results[0].length);
  var a1Notation = sheet.getName() + '!' + range.getA1Notation();

  var sheetValues = range.getValues();
  for (var r = 0; r < sheetValues.length; r++) {
    for (var c = 0; c < 1; c++) {  // only check for the first element, override everything else
      if (sheetValues[r][c] !== '' && results[r][c] !== null && sheetValues[r][c] !== results[r][c]) {
        // user input something other than what was fetched
        results[r][c] = null;
      }
    }
  }
   
  // Prepare the write request
  var request = {
    valueInputOption: 'USER_ENTERED',
    data: [{
      range: a1Notation,
      majorDimension: 'ROWS',
      values: results,
    }]
  };
  
  // Check to see if there is any extraneous stuff, which can happen
  // when run for the first time (because previous owners' stuff is still there)
  var dataRange = sheet.getDataRange();
  if (dataRange.getNumRows() > results.length) {
      var clearRange = sheet.getRange(results.length + 1, 1, dataRange.getNumRows() - results.length, dataRange.getNumColumns());
      clearRange.clear();
  }

  //dataRange.clear();
  
  Sheets.Spreadsheets.Values.batchUpdate(request, ss.getId());
}

function testExtract() {
  urls = [];   // test with a bunch of different files
  urls.forEach(function (url) {
    var result = extractTitle(url);
    Logger.log(result);
  });
}

/*
  extractTitle
  Determine the title of the url we have.
  
  Fallback method is to download the html and inspect the title (using a regular expression, yes i know you should
  not parse html with regexp, please don't lecture me, but the XMLService sucks and we are just grabbing a sequonce of chars
  it is fine the internet will not break because of it)
  
  It first detects whether this might be a G Suite doc of some sort, and extract the id, and tries to use the Drive API 
  to get the file name. It returns the name upon success, or else continues to fallback method.
*/
function extractTitle(url) {

  var IdRegExp = /(id\=|\/d\/)([-\w]{25,})/;   // find a "d/.." or "id=.." where .. is any sequence of 25 characters/dash
  if (IdRegExp.test(url)) {
    var fileId = url.match(IdRegExp)[2];
    // if we have a url with an ID in it and it's not a form (because forms can't be fetched with Drive)
    try {
      var file = Drive.Files.get(fileId);
      return file.title;
    } catch (err) {
      Logger.log('ERROR: ' + err);
      // let it continue to fallback by grabbing the title from the html
    }
  }
  
  try {
    var response = UrlFetchApp.fetch(url);
  } catch (err) {
    return err.toString();
  }
  var content = response.getContentText();
  var regExp = /<title>(.*?)<\/title>/;
  var title = null;
  if (regExp.test(content)) {
    var title = regExp.exec(content)[1];
  }
  return title;
}

/**
 * Returns the shortened Url.
 *
 * @param {number} url The url to shorten.
 * @return the shortened url.
 */
function shorten () {
  if (!checkIfCanContinue("You are not the owner of this sheet, thus you cannot use this service. Make a copy of this sheet for your own use.")) {
    return;
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Make Short Url');
  var range = sheet.getRange(2, 1);
  var url = range.getValue();

  var response = UrlShortener.Url.insert({
    longUrl: url,
  });

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Make Short Url');
  var range = sheet.getRange(2, 2);
  range.setValue(response.id);
}
