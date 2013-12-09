casper.test.begin('Run the unit tests and make sure tehy all pass.', 10, function suite(test) {

    casper.start("http://localhost:8675/tests", function() {
        test.assertExists('progress', "Unit tests have initialized");
    });

    casper.waitFor(function() {
        return casper.exists('progress[value="1"]');
    });

    casper.then(function() {
        test.assertEquals(casper.fetchText('#c_failed'), '0',
                          'Assert no failures');
        test.assertEquals(casper.fetchText('#c_started'),
                          casper.fetchText('#c_passed'),
                          'Assert all tests ended');
    });

    casper.run(function() {
        test.done();
    });

});
