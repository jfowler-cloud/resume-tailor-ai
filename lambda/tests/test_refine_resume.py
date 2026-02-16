"""
Unit tests for refine_resume Lambda function
"""
import json
import pytest
from unittest.mock import Mock, patch, MagicMock
from refine_resume import handler


class TestRefineResumeHandler:
    """Tests for resume refinement handler"""

    def _create_stream_response(self, text_chunks):
        """Helper to create a mock streaming response"""
        events = []
        for chunk in text_chunks:
            events.append({
                'chunk': {
                    'bytes': json.dumps({
                        'type': 'content_block_delta',
                        'delta': {
                            'type': 'text_delta',
                            'text': chunk
                        }
                    }).encode()
                }
            })
        return events

    def test_successful_resume_refinement(self):
        """Test successful resume refinement with feedback"""
        event = {
            'originalResume': '# John Doe\n## Experience\n- Software Engineer',
            'criticalReview': {
                'weaknesses': ['Lacks quantified achievements'],
                'actionableSteps': ['Add metrics to bullet points'],
                'redFlags': ['No dates on positions']
            },
            'jobDescription': 'Senior Developer role',
            'parsedJob': {'requiredSkills': ['Python', 'AWS']}
        }

        refined_text = '# John Doe\n## Experience\n- Software Engineer (2020-Present)\n  - Increased performance by 40%'

        with patch('refine_resume.bedrock') as mock_bedrock:
            stream_events = self._create_stream_response([
                '# John Doe\n',
                '## Experience\n',
                '- Software Engineer (2020-Present)\n',
                '  - Increased performance by 40%'
            ])

            mock_stream = MagicMock()
            mock_stream.__iter__ = lambda self: iter(stream_events)

            mock_bedrock.invoke_model_with_response_stream.return_value = {
                'body': mock_stream
            }

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert '# John Doe' in result['refinedResumeMarkdown']
            assert 'Software Engineer' in result['refinedResumeMarkdown']

    def test_refinement_with_empty_feedback(self):
        """Test refinement when no feedback provided"""
        event = {
            'originalResume': '# Resume Content',
            'criticalReview': {},
            'jobDescription': 'Developer role',
            'parsedJob': {}
        }

        with patch('refine_resume.bedrock') as mock_bedrock:
            stream_events = self._create_stream_response(['# Refined Resume Content'])

            mock_stream = MagicMock()
            mock_stream.__iter__ = lambda self: iter(stream_events)

            mock_bedrock.invoke_model_with_response_stream.return_value = {
                'body': mock_stream
            }

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['refinedResumeMarkdown'] == '# Refined Resume Content'

    def test_refinement_with_multiple_weaknesses(self):
        """Test refinement addresses multiple weaknesses"""
        event = {
            'originalResume': '# Resume',
            'criticalReview': {
                'weaknesses': [
                    'Missing metrics',
                    'Poor formatting',
                    'Generic language'
                ],
                'actionableSteps': [
                    'Add numbers',
                    'Use proper headers',
                    'Use action verbs'
                ],
                'redFlags': ['Employment gaps']
            },
            'jobDescription': 'Role description',
            'parsedJob': {'keywords': ['leadership', 'management']}
        }

        with patch('refine_resume.bedrock') as mock_bedrock:
            stream_events = self._create_stream_response([
                '# Improved Resume\n',
                '## Summary\n',
                'Results-driven professional...'
            ])

            mock_stream = MagicMock()
            mock_stream.__iter__ = lambda self: iter(stream_events)

            mock_bedrock.invoke_model_with_response_stream.return_value = {
                'body': mock_stream
            }

            result = handler(event, None)

            assert result['statusCode'] == 200
            # Verify bedrock was called with proper prompt
            mock_bedrock.invoke_model_with_response_stream.assert_called_once()

    def test_refinement_streaming_chunks(self):
        """Test that streaming chunks are properly concatenated"""
        event = {
            'originalResume': '# Resume',
            'criticalReview': {'weaknesses': ['issue']},
            'jobDescription': 'Job',
            'parsedJob': {}
        }

        chunks = ['Hello ', 'World ', 'from ', 'streaming!']

        with patch('refine_resume.bedrock') as mock_bedrock:
            stream_events = self._create_stream_response(chunks)

            mock_stream = MagicMock()
            mock_stream.__iter__ = lambda self: iter(stream_events)

            mock_bedrock.invoke_model_with_response_stream.return_value = {
                'body': mock_stream
            }

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['refinedResumeMarkdown'] == 'Hello World from streaming!'

    def test_refinement_strips_whitespace(self):
        """Test that refined resume is stripped of extra whitespace"""
        event = {
            'originalResume': '# Resume',
            'criticalReview': {},
            'jobDescription': 'Job',
            'parsedJob': {}
        }

        with patch('refine_resume.bedrock') as mock_bedrock:
            stream_events = self._create_stream_response(['\n\n  # Resume Content  \n\n'])

            mock_stream = MagicMock()
            mock_stream.__iter__ = lambda self: iter(stream_events)

            mock_bedrock.invoke_model_with_response_stream.return_value = {
                'body': mock_stream
            }

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['refinedResumeMarkdown'] == '# Resume Content'

    def test_refinement_bedrock_error(self):
        """Test handling of Bedrock API error"""
        event = {
            'originalResume': '# Resume',
            'criticalReview': {},
            'jobDescription': 'Job',
            'parsedJob': {}
        }

        with patch('refine_resume.bedrock') as mock_bedrock:
            mock_bedrock.invoke_model_with_response_stream.side_effect = Exception('Bedrock streaming error')

            result = handler(event, None)

            assert result['statusCode'] == 500
            assert 'error' in result
            assert 'Bedrock streaming error' in result['error']

    def test_refinement_empty_stream(self):
        """Test handling of empty stream response"""
        event = {
            'originalResume': '# Resume',
            'criticalReview': {},
            'jobDescription': 'Job',
            'parsedJob': {}
        }

        with patch('refine_resume.bedrock') as mock_bedrock:
            mock_stream = MagicMock()
            mock_stream.__iter__ = lambda self: iter([])

            mock_bedrock.invoke_model_with_response_stream.return_value = {
                'body': mock_stream
            }

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['refinedResumeMarkdown'] == ''

    def test_refinement_handles_non_text_delta_events(self):
        """Test that non-text_delta events are handled gracefully"""
        event = {
            'originalResume': '# Resume',
            'criticalReview': {},
            'jobDescription': 'Job',
            'parsedJob': {}
        }

        with patch('refine_resume.bedrock') as mock_bedrock:
            # Mix of text_delta and other event types
            events = [
                {
                    'chunk': {
                        'bytes': json.dumps({
                            'type': 'content_block_start',
                            'content_block': {'type': 'text'}
                        }).encode()
                    }
                },
                {
                    'chunk': {
                        'bytes': json.dumps({
                            'type': 'content_block_delta',
                            'delta': {'type': 'text_delta', 'text': 'Actual content'}
                        }).encode()
                    }
                },
                {
                    'chunk': {
                        'bytes': json.dumps({
                            'type': 'content_block_stop'
                        }).encode()
                    }
                }
            ]

            mock_stream = MagicMock()
            mock_stream.__iter__ = lambda self: iter(events)

            mock_bedrock.invoke_model_with_response_stream.return_value = {
                'body': mock_stream
            }

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['refinedResumeMarkdown'] == 'Actual content'

    def test_refinement_missing_original_resume(self):
        """Test refinement when original resume is missing"""
        event = {
            'criticalReview': {'weaknesses': ['No resume provided']},
            'jobDescription': 'Job',
            'parsedJob': {}
        }

        with patch('refine_resume.bedrock') as mock_bedrock:
            stream_events = self._create_stream_response(['Cannot refine without original'])

            mock_stream = MagicMock()
            mock_stream.__iter__ = lambda self: iter(stream_events)

            mock_bedrock.invoke_model_with_response_stream.return_value = {
                'body': mock_stream
            }

            result = handler(event, None)

            # Should still process - bedrock will handle the empty input
            assert result['statusCode'] == 200

    def test_refinement_with_none_body_stream(self):
        """Test handling when body stream is None"""
        event = {
            'originalResume': '# Resume',
            'criticalReview': {},
            'jobDescription': 'Job',
            'parsedJob': {}
        }

        with patch('refine_resume.bedrock') as mock_bedrock:
            mock_bedrock.invoke_model_with_response_stream.return_value = {
                'body': None
            }

            result = handler(event, None)

            assert result['statusCode'] == 200
            assert result['refinedResumeMarkdown'] == ''
