casper.start("http://localhost:8675/tests", function() {
    casper.test.assertExists('progress', "Unit tests have initialized");
});

casper.waitFor(function() {
    return casper.exists('progress[value="1"]');
});

casper.then(function() {
    casper.test.assertEquals(casper.fetchText('#c_failed'), '0',
                             'Assert no failures');
    casper.test.assertEquals(casper.fetchText('#c_started'),
                             casper.fetchText('#c_passed'),
                             'Assert all tests ended');
});

casper.run(function() {
    casper.test.done(2);
});
