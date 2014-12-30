python -m splash.server -v 4 &
python -m tests.server &

sleep 5

nosetests -s tests