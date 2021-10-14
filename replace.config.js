module.exports = {
    files: 'lib/**/*.*',
    from: /import \* as /g,
    to: 'import ',
};
