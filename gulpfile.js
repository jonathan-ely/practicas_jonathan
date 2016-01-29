// Include gulp
var gulp = require('gulp');
// Include plugins
var concat = require('gulp-concat');
// Concatenate JS Files
gulp.task('scripts', function() {
    return gulp.src('src/*.js')
    .pipe(concat('main.js'))
    .pipe(gulp.dest('.'));
});

// Default task
gulp.task('default', ['scripts', 'watch']);

gulp.task('watch', function() {
    gulp.watch('src/*.js', ['scripts']);
});